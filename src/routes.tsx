import { Route, Routes } from 'react-router-dom';

import { AuthGuard } from '@/app/auth';
import {
  AuthCallbackPage,
  AuthPage,
  CharacterDetailsPage,
  CharactersPage,
  ConfirmEmailPage,
  ForgotPasswordPage,
  LorasPage,
  ProfilePage,
  ResetPasswordPage,
  UiKitPage,
} from '@/pages';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
      <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset" element={<ResetPasswordPage />} />
      <Route element={<AuthGuard />}>
        <Route path="/ui" element={<UiKitPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/characters/:id" element={<CharacterDetailsPage />} />
        <Route path="/loras" element={<LorasPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
