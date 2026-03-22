-- ============================================================
--  ACTIONHUB – Schéma SQL Multi-Tenant (Supabase / PostgreSQL)
--  Version : 1.0
--  Isolation : Row Level Security (RLS) par tenant
--  Rôles : super_admin | admin | responsable | collaborateur
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 0. EXTENSIONS
-- ════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ════════════════════════════════════════════════════════════
-- 1. ENUM : RÔLES UTILISATEURS
-- ════════════════════════════════════════════════════════════
CREATE TYPE user_role AS ENUM (
  'super_admin',    -- voit et gère TOUTES les entreprises
  'admin',          -- gère les utilisateurs de SON entreprise
  'responsable',    -- voit ses actions + celles de son équipe
  'collaborateur'   -- voit uniquement ses propres actions
);


-- ════════════════════════════════════════════════════════════
-- 2. ENUM : STATUTS & PRIORITÉS
-- ════════════════════════════════════════════════════════════
CREATE TYPE action_statut AS ENUM (
  'todo',       -- à faire
  'wip',        -- En cours
  'blocked',    -- Bloqué
  'done'        -- Terminé
);

CREATE TYPE action_priorite AS ENUM (
  'haute',
  'moyen',
  'faible'
);


-- ════════════════════════════════════════════════════════════
-- 3. TABLE : TENANTS (entreprises)
-- ════════════════════════════════════════════════════════════
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,        -- identifiant URL ex: "sival"
  logo_url      TEXT,
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tenants IS 'Une ligne = une entreprise cliente (tenant)';
COMMENT ON COLUMN tenants.slug IS 'Identifiant court unique, utilisé dans les URLs et emails';

-- Index
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_actif ON tenants(actif);


-- ════════════════════════════════════════════════════════════
-- 4. TABLE : PROFILES UTILISATEURS
--    Étend auth.users de Supabase (1 profil par user Supabase)
-- ════════════════════════════════════════════════════════════
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  -- tenant_id NULL = super_admin (accès cross-tenant)
  role          user_role NOT NULL DEFAULT 'collaborateur',
  nom           TEXT NOT NULL,
  prenom        TEXT NOT NULL,
  email         TEXT NOT NULL,
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT super_admin_no_tenant CHECK (
    (role = 'super_admin' AND tenant_id IS NULL)
    OR
    (role != 'super_admin' AND tenant_id IS NOT NULL)
  )
);

COMMENT ON TABLE profiles IS 'Profil utilisateur lié à auth.users de Supabase';
COMMENT ON COLUMN profiles.tenant_id IS 'NULL pour les super_admin uniquement';

-- Index
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_role   ON profiles(role);
CREATE INDEX idx_profiles_email  ON profiles(email);


-- ════════════════════════════════════════════════════════════
-- 5. TABLE : ÉQUIPES
--    Un responsable peut avoir une équipe de collaborateurs
-- ════════════════════════════════════════════════════════════
CREATE TABLE equipes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  responsable_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table de liaison équipe <-> membres
CREATE TABLE equipe_membres (
  equipe_id     UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (equipe_id, user_id)
);

-- Index
CREATE INDEX idx_equipes_tenant      ON equipes(tenant_id);
CREATE INDEX idx_equipes_resp        ON equipes(responsable_id);
CREATE INDEX idx_equipe_membres_user ON equipe_membres(user_id);


-- ════════════════════════════════════════════════════════════
-- 6. TABLE : PLANS D'ACTION
-- ════════════════════════════════════════════════════════════
CREATE TABLE plans_action (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  description   TEXT,
  source_type   TEXT CHECK (source_type IN ('excel','csv','google_sheets','manuel')),
  source_url    TEXT,                         -- lien GSheets si applicable
  fichier_path  TEXT,                         -- chemin Supabase Storage si Excel/CSV
  actif         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE plans_action IS 'Un plan d action = un fichier source importé ou créé manuellement';

-- Index
CREATE INDEX idx_plans_tenant ON plans_action(tenant_id);
CREATE INDEX idx_plans_actif  ON plans_action(tenant_id, actif);


-- ════════════════════════════════════════════════════════════
-- 7. TABLE : ACTIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE actions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES plans_action(id) ON DELETE CASCADE,

  -- Données métier
  description     TEXT NOT NULL,
  responsable_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  responsable_txt TEXT,                       -- nom brut si pas encore lié à un profil
  echeance        DATE,
  statut          action_statut NOT NULL DEFAULT 'todo',
  priorite        action_priorite,
  commentaire     TEXT,

  -- Traçabilité
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE actions IS 'Ligne d action individuelle, rattachée à un plan et un tenant';
COMMENT ON COLUMN actions.responsable_txt IS 'Nom brut conservé si le responsable n est pas encore un utilisateur de la plateforme';

-- Index
CREATE INDEX idx_actions_tenant      ON actions(tenant_id);
CREATE INDEX idx_actions_plan        ON actions(plan_id);
CREATE INDEX idx_actions_responsable ON actions(responsable_id);
CREATE INDEX idx_actions_statut      ON actions(tenant_id, statut);
CREATE INDEX idx_actions_echeance    ON actions(tenant_id, echeance);


-- ════════════════════════════════════════════════════════════
-- 8. TABLE : HISTORIQUE DES MODIFICATIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE actions_historique (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id     UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  champ         TEXT NOT NULL,               -- ex: "statut", "echeance"
  ancienne_val  TEXT,
  nouvelle_val  TEXT,
  modifie_le    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE actions_historique IS 'Traçabilité complète de chaque modification d une action';

-- Index
CREATE INDEX idx_historique_action ON actions_historique(action_id);
CREATE INDEX idx_historique_tenant ON actions_historique(tenant_id);


-- ════════════════════════════════════════════════════════════
-- 9. FONCTION UTILITAIRE : tenant_id de l'utilisateur courant
--    Utilisée dans toutes les policies RLS
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  )
$$;


-- ════════════════════════════════════════════════════════════
-- 10. ROW LEVEL SECURITY (RLS)
--     Isolation totale entre tenants garantie au niveau DB
-- ════════════════════════════════════════════════════════════

-- Activer RLS sur toutes les tables
ALTER TABLE tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipe_membres    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans_action      ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions_historique ENABLE ROW LEVEL SECURITY;


-- ── TENANTS ──
-- Super admin : tout voir
CREATE POLICY tenants_super_admin ON tenants
  FOR ALL USING (is_super_admin());

-- Admin/Responsable/Collaborateur : uniquement leur tenant
CREATE POLICY tenants_own ON tenants
  FOR SELECT USING (id = current_tenant_id());


-- ── PROFILES ──
-- Super admin : tout voir
CREATE POLICY profiles_super_admin ON profiles
  FOR ALL USING (is_super_admin());

-- Chacun voit son propre profil
CREATE POLICY profiles_self ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admin : voit tous les profils de son tenant
CREATE POLICY profiles_admin_read ON profiles
  FOR SELECT USING (
    current_user_role() = 'admin'
    AND tenant_id = current_tenant_id()
  );

-- Admin : crée/modifie des profils dans son tenant
CREATE POLICY profiles_admin_write ON profiles
  FOR INSERT WITH CHECK (
    current_user_role() = 'admin'
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY profiles_admin_update ON profiles
  FOR UPDATE USING (
    current_user_role() = 'admin'
    AND tenant_id = current_tenant_id()
  );

-- Responsable : voit les membres de son équipe
CREATE POLICY profiles_responsable ON profiles
  FOR SELECT USING (
    current_user_role() = 'responsable'
    AND tenant_id = current_tenant_id()
    AND (
      id = auth.uid()
      OR id IN (
        SELECT em.user_id FROM equipe_membres em
        JOIN equipes e ON e.id = em.equipe_id
        WHERE e.responsable_id = auth.uid()
      )
    )
  );


-- ── ÉQUIPES ──
CREATE POLICY equipes_super_admin ON equipes
  FOR ALL USING (is_super_admin());

CREATE POLICY equipes_tenant ON equipes
  FOR ALL USING (tenant_id = current_tenant_id());


-- ── EQUIPE_MEMBRES ──
CREATE POLICY equipe_membres_super_admin ON equipe_membres
  FOR ALL USING (is_super_admin());

CREATE POLICY equipe_membres_tenant ON equipe_membres
  FOR ALL USING (
    equipe_id IN (
      SELECT id FROM equipes WHERE tenant_id = current_tenant_id()
    )
  );


-- ── PLANS D'ACTION ──
CREATE POLICY plans_super_admin ON plans_action
  FOR ALL USING (is_super_admin());

CREATE POLICY plans_tenant_read ON plans_action
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY plans_admin_write ON plans_action
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('admin', 'responsable')
  );


-- ── ACTIONS ──
CREATE POLICY actions_super_admin ON actions
  FOR ALL USING (is_super_admin());

-- Admin : toutes les actions du tenant
CREATE POLICY actions_admin ON actions
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'admin'
  );

-- Responsable : ses actions + celles de son équipe
CREATE POLICY actions_responsable ON actions
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'responsable'
    AND (
      responsable_id = auth.uid()
      OR responsable_id IN (
        SELECT em.user_id FROM equipe_membres em
        JOIN equipes e ON e.id = em.equipe_id
        WHERE e.responsable_id = auth.uid()
      )
    )
  );

-- Collaborateur : uniquement ses propres actions
CREATE POLICY actions_collaborateur ON actions
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'collaborateur'
    AND responsable_id = auth.uid()
  );

CREATE POLICY actions_collaborateur_update ON actions
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'collaborateur'
    AND responsable_id = auth.uid()
  );


-- ── HISTORIQUE ──
CREATE POLICY historique_super_admin ON actions_historique
  FOR ALL USING (is_super_admin());

CREATE POLICY historique_tenant ON actions_historique
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY historique_insert ON actions_historique
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());


-- ════════════════════════════════════════════════════════════
-- 11. TRIGGERS : updated_at automatique
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON plans_action
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_actions_updated_at
  BEFORE UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 12. TRIGGER : historique automatique sur actions
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_action_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF OLD.statut IS DISTINCT FROM NEW.statut THEN
    INSERT INTO actions_historique(action_id, tenant_id, user_id, champ, ancienne_val, nouvelle_val)
    VALUES (NEW.id, NEW.tenant_id, v_user_id, 'statut', OLD.statut::TEXT, NEW.statut::TEXT);
  END IF;
  IF OLD.echeance IS DISTINCT FROM NEW.echeance THEN
    INSERT INTO actions_historique(action_id, tenant_id, user_id, champ, ancienne_val, nouvelle_val)
    VALUES (NEW.id, NEW.tenant_id, v_user_id, 'echeance', OLD.echeance::TEXT, NEW.echeance::TEXT);
  END IF;
  IF OLD.responsable_id IS DISTINCT FROM NEW.responsable_id THEN
    INSERT INTO actions_historique(action_id, tenant_id, user_id, champ, ancienne_val, nouvelle_val)
    VALUES (NEW.id, NEW.tenant_id, v_user_id, 'responsable_id', OLD.responsable_id::TEXT, NEW.responsable_id::TEXT);
  END IF;
  IF OLD.priorite IS DISTINCT FROM NEW.priorite THEN
    INSERT INTO actions_historique(action_id, tenant_id, user_id, champ, ancienne_val, nouvelle_val)
    VALUES (NEW.id, NEW.tenant_id, v_user_id, 'priorite', OLD.priorite::TEXT, NEW.priorite::TEXT);
  END IF;
  IF OLD.commentaire IS DISTINCT FROM NEW.commentaire THEN
    INSERT INTO actions_historique(action_id, tenant_id, user_id, champ, ancienne_val, nouvelle_val)
    VALUES (NEW.id, NEW.tenant_id, v_user_id, 'commentaire', OLD.commentaire, NEW.commentaire);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_actions_historique
  AFTER UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION log_action_changes();


-- ════════════════════════════════════════════════════════════
-- 13. TRIGGER : création automatique du profil après signup
--     Se déclenche quand Supabase Auth crée un nouvel utilisateur
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, nom, prenom, tenant_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    (NEW.raw_user_meta_data->>'tenant_id')::UUID,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'collaborateur')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ════════════════════════════════════════════════════════════
-- 14. DONNÉES DE DÉMARRAGE : Super Admin initial
--     À exécuter manuellement après la création du 1er compte
-- ════════════════════════════════════════════════════════════
-- Remplacer '<UUID_DU_SUPER_ADMIN>' par l'UUID issu de auth.users
/*
UPDATE profiles
SET role = 'super_admin', tenant_id = NULL
WHERE id = '<UUID_DU_SUPER_ADMIN>';
*/


-- ════════════════════════════════════════════════════════════
-- 15. VUES UTILES
-- ════════════════════════════════════════════════════════════

-- Vue consolidée : actions avec infos responsable et plan
CREATE OR REPLACE VIEW v_actions_detail AS
SELECT
  a.id,
  a.tenant_id,
  t.nom                                     AS tenant_nom,
  a.plan_id,
  p.nom                                     AS plan_nom,
  a.description,
  a.responsable_id,
  CONCAT(pr.prenom, ' ', pr.nom)            AS responsable_nom,
  COALESCE(CONCAT(pr.prenom,' ',pr.nom), a.responsable_txt) AS responsable_display,
  a.echeance,
  CASE
    WHEN a.statut = 'done'            THEN 'done'
    WHEN a.echeance < CURRENT_DATE    THEN 'retard'
    WHEN a.echeance <= CURRENT_DATE + 7 THEN 'urgent'
    ELSE 'normal'
  END                                       AS echeance_status,
  a.statut,
  a.priorite,
  a.commentaire,
  a.created_at,
  a.updated_at
FROM actions a
JOIN tenants t       ON t.id = a.tenant_id
JOIN plans_action p  ON p.id = a.plan_id
LEFT JOIN profiles pr ON pr.id = a.responsable_id;

-- Vue tableau de bord par tenant
CREATE OR REPLACE VIEW v_stats_tenant AS
SELECT
  tenant_id,
  COUNT(*)                                              AS total,
  COUNT(*) FILTER (WHERE statut = 'done')               AS terminees,
  COUNT(*) FILTER (WHERE statut = 'wip')                AS en_cours,
  COUNT(*) FILTER (WHERE statut = 'todo')               AS a_faire,
  COUNT(*) FILTER (WHERE statut = 'blocked')            AS bloquees,
  COUNT(*) FILTER (WHERE echeance < CURRENT_DATE
                    AND statut != 'done')               AS en_retard,
  COUNT(*) FILTER (WHERE echeance BETWEEN CURRENT_DATE
                    AND CURRENT_DATE + 7
                    AND statut != 'done')               AS urgentes,
  ROUND(
    COUNT(*) FILTER (WHERE statut = 'done') * 100.0
    / NULLIF(COUNT(*), 0), 1
  )                                                     AS taux_completion
FROM actions
GROUP BY tenant_id;


-- ════════════════════════════════════════════════════════════
-- FIN DU SCHÉMA
-- ════════════════════════════════════════════════════════════
-- Tables créées :
--   tenants | profiles | equipes | equipe_membres
--   plans_action | actions | actions_historique
--
-- Sécurité :
--   RLS activé sur toutes les tables
--   7 policies d'isolation par tenant
--   Fonctions helper : current_tenant_id(), current_user_role(), is_super_admin()
--
-- Automatisations :
--   updated_at auto sur toutes les tables
--   Historique auto sur chaque modification d'action
--   Création de profil auto au signup Supabase
-- ════════════════════════════════════════════════════════════
