import { Route, Routes } from 'react-router-dom';

import { AuthGuard } from '@/app/auth';
import {
  AuthCallbackPage,
  AuthPage,
  AdminsPage,
  CharacterDetailsPage,
  CharactersPage,
  ConfirmEmailPage,
  ForgotPasswordPage,
  GenerationDetailsPage,
  GenerateImagePage,
  GenerationsPage,
  LorasPage,
  PromptCreatePage,
  PromptUpdatePage,
  PromptsPage,
  PlansPage,
  ProfilePage,
  ResetPasswordPage,
  UiKitPage,
  UsersPage,
} from '@/pages';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CharactersPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
      <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset" element={<ResetPasswordPage />} />
      <Route element={<AuthGuard />}>
        <Route path="/ui" element={<UiKitPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/characters/:id" element={<CharacterDetailsPage />} />
        <Route path="/admins" element={<AdminsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/generations/new" element={<GenerateImagePage />} />
        <Route path="/generations" element={<GenerationsPage />} />
        <Route path="/generations/:id" element={<GenerationDetailsPage />} />
        <Route path="/loras" element={<LorasPage />} />
        <Route path="/prompts" element={<PromptsPage />} />
        <Route path="/prompts/new" element={<PromptCreatePage />} />
        <Route path="/prompts/:id" element={<PromptUpdatePage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
