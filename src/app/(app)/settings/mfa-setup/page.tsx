import { MfaSetup } from "@/components/settings/mfa-setup";

export default function MfaSetupPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">
        Two-factor authentication
      </h1>
      <MfaSetup />
    </div>
  );
}
