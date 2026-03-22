import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-mono text-2xl font-semibold text-accent2 tracking-[3px] uppercase mb-2">
            Action<span className="text-text3">Hub</span>
          </h1>
          <p className="text-text3 text-sm">
            Consolidation de plans d&apos;action multi-tenant
          </p>
        </div>

        <div className="card">
          <h2 className="text-lg font-medium mb-6 text-center">Connexion</h2>
          <LoginForm />
        </div>

        <p className="text-center text-text3 text-xs mt-6">
          Vous n&apos;avez pas de compte ? Contactez votre administrateur.
        </p>
      </div>
    </div>
  );
}
