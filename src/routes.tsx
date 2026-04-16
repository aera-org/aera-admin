import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';

import { AuthGuard } from '@/app/auth';
import {
  AdminsPage,
  AnalyticsPage,
  AuthCallbackPage,
  AuthPage,
  BatchImageDetailsPage,
  BatchImagesPage,
  BroadcastPage,
  CharacterDetailsPage,
  CharacterImagesPage,
  CharactersPage,
  ChatDetailsPage,
  ChatsPage,
  ConfirmEmailPage,
  CustomCharacterCreatePage,
  CustomCharacterDetailsPage,
  CustomCharactersPage,
  DatasetDetailsPage,
  DatasetsPage,
  ForgotPasswordPage,
  GenerateImagePage,
  GenerationDetailsPage,
  GenerationsPage,
  GiftDetailsPage,
  GiftsPage,
  LogsPage,
  LorasPage,
  PlansPage,
  PoseCreatePage,
  PosesPage,
  PoseUpdatePage,
  ProfilePage,
  PromptCreatePage,
  PromptsPage,
  PromptUpdatePage,
  ResetPasswordPage,
  ScenarioGenCreatePage,
  ScenarioGenDetailsPage,
  ScenarioGenPage,
  UiKitPage,
  UserDetailsPage,
  UsersPage,
  VideoDetailsPage,
  VideosPage,
} from '@/pages';

function CharacterImageDrawerRedirect() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  if (id) {
    searchParams.set('imageId', id);
  }

  const search = searchParams.toString();
  return <Navigate to={`/character-images${search ? `?${search}` : ''}`} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
      <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset" element={<ResetPasswordPage />} />
      <Route element={<AuthGuard />}>
        <Route path="/" element={<AnalyticsPage />} />
        <Route path="/ui" element={<UiKitPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/characters/:id" element={<CharacterDetailsPage />} />
        <Route
          path="/custom-characters/new"
          element={<CustomCharacterCreatePage />}
        />
        <Route
          path="/custom-characters/:id"
          element={<CustomCharacterDetailsPage />}
        />
        <Route path="/custom-characters" element={<CustomCharactersPage />} />
        <Route path="/character-images" element={<CharacterImagesPage />} />
        <Route
          path="/character-images/:id"
          element={<CharacterImageDrawerRedirect />}
        />
        <Route path="/admins" element={<AdminsPage />} />
        <Route path="/broadcast" element={<BroadcastPage />} />
        <Route path="/batch-images" element={<BatchImagesPage />} />
        <Route
          path="/batch-images/:id"
          element={<BatchImageDetailsPage />}
        />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:id" element={<UserDetailsPage />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/chats/:id" element={<ChatDetailsPage />} />
        <Route path="/generations/new" element={<GenerateImagePage />} />
        <Route path="/generations" element={<GenerationsPage />} />
        <Route path="/generations/:id" element={<GenerationDetailsPage />} />
        <Route path="/gifts" element={<GiftsPage />} />
        <Route path="/gifts/:id" element={<GiftDetailsPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/datasets/:id" element={<DatasetDetailsPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/videos/:id" element={<VideoDetailsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/loras" element={<LorasPage />} />
        <Route path="/poses" element={<PosesPage />} />
        <Route path="/poses/new" element={<PoseCreatePage />} />
        <Route path="/poses/:id" element={<PoseUpdatePage />} />
        <Route path="/prompts" element={<PromptsPage />} />
        <Route path="/prompts/new" element={<PromptCreatePage />} />
        <Route path="/prompts/:id" element={<PromptUpdatePage />} />
        <Route path="/scenario-gen" element={<ScenarioGenPage />} />
        <Route path="/scenario-gen/new" element={<ScenarioGenCreatePage />} />
        <Route path="/scenario-gen/:id" element={<ScenarioGenDetailsPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
