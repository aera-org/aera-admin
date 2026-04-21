import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useCreatePostSetRef,
  usePostSetDetails,
  useUpdatePostSet,
} from '@/app/posts';
import {
  Alert,
  Button,
  Card,
  Container,
  EmptyState,
  Field,
  Input,
  Modal,
  Stack,
  Textarea,
  Typography,
} from '@/atoms';
import { AppShell } from '@/components/templates';

import {
  PostItemCard,
  PostItemCardSkeleton,
} from './components/PostItemCard';
import s from './PostsSetDetailsPage.module.scss';

export function PostsSetDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const setId = id ?? '';
  const { data, error, isLoading, refetch } = usePostSetDetails(setId);
  const createRefMutation = useCreatePostSetRef();
  const updateMutation = useUpdatePostSet();
  const refsText = data?.refs.length ? data.refs.join(', ') : '—';
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddRefOpen, setIsAddRefOpen] = useState(false);
  const [note, setNote] = useState('');
  const [refValue, setRefValue] = useState('');

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;

  const openEditModal = () => {
    setNote(data?.note ?? '');
    setIsEditOpen(true);
  };

  const openAddRefModal = () => {
    setRefValue('');
    setIsAddRefOpen(true);
  };

  const closeEditModal = () => {
    if (updateMutation.isPending) return;
    setIsEditOpen(false);
    setNote(data?.note ?? '');
  };

  const closeAddRefModal = () => {
    if (createRefMutation.isPending) return;
    setIsAddRefOpen(false);
    setRefValue('');
  };

  const handleEdit = async () => {
    if (!setId) return;

    await updateMutation.mutateAsync({
      id: setId,
      payload: {
        note: note.trim() || undefined,
      },
    });
    setIsEditOpen(false);
  };

  const handleAddRef = async () => {
    if (!setId || !refValue.trim()) return;

    await createRefMutation.mutateAsync({
      id: setId,
      payload: {
        ref: refValue.trim(),
      },
    });
    setIsAddRefOpen(false);
    setRefValue('');
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Post set details</Typography>
            {data ? (
              <Typography variant="meta" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <div className={s.headerActions}>
            <Button
              variant="secondary"
              onClick={openAddRefModal}
              disabled={!data}
            >
              Add Ref
            </Button>
            <Button
              variant="secondary"
              onClick={openEditModal}
              disabled={!data}
            >
              Edit
            </Button>
            <Button variant="secondary" onClick={() => navigate('/posts/sets')}>
              Back to sets
            </Button>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load post set"
              description={
                error instanceof Error ? error.message : 'Please try again.'
              }
              tone="warning"
            />
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : null}

        {showEmpty ? (
          <EmptyState title="Post set not found" description="Check the ID." />
        ) : null}

        {showSkeleton ? (
          <>
            <div className={s.metaGrid}>
              {Array.from({ length: 3 }, (_, index) => (
                <Card key={`meta-skeleton-${index}`}>
                  <Stack gap="8px">
                    <Typography variant="meta" tone="muted">
                      Loading...
                    </Typography>
                    <Typography variant="body">...</Typography>
                  </Stack>
                </Card>
              ))}
            </div>
            <div className={s.galleryWrap}>
              <div className={s.galleryGrid}>
                {Array.from({ length: 6 }, (_, index) => (
                  <PostItemCardSkeleton key={`set-post-skeleton-${index}`} />
                ))}
              </div>
            </div>
          </>
        ) : null}

        {data ? (
          <>
            <div className={s.metaGrid}>
              <Card className={s.metaCard}>
                <Typography variant="meta" tone="muted">
                  Set ID
                </Typography>
                <Typography variant="body">
                  {data.id}
                </Typography>
              </Card>
              <Card className={s.metaCard}>
                <Typography variant="meta" tone="muted">
                  Posts
                </Typography>
                <Typography variant="body">
                  {data.posts.length.toLocaleString()}
                </Typography>
              </Card>
              <Card className={s.metaCard}>
                <Typography variant="meta" tone="muted">
                  Note
                </Typography>
                <Typography className={s.noteValue} variant="body">
                  {data.note?.trim() || '—'}
                </Typography>
              </Card>
              <Card className={s.metaCard}>
                <Typography variant="meta" tone="muted">
                  Refs
                </Typography>
                <Typography className={s.refsValue} variant="body">
                  {refsText}
                </Typography>
              </Card>
            </div>

            <div className={s.galleryWrap}>
              <div className={s.galleryGrid}>
                {data.posts.map((post) => (
                  <PostItemCard key={post.id} item={post} />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </Container>
      <Modal
        open={isEditOpen}
        title="Edit post set"
        onClose={closeEditModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeEditModal}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleEdit()}
              loading={updateMutation.isPending}
              disabled={updateMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Field label="Note" labelFor="post-set-note">
          <Textarea
            id="post-set-note"
            value={note}
            rows={4}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </Modal>
      <Modal
        open={isAddRefOpen}
        title="Add ref"
        onClose={closeAddRefModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeAddRefModal}
              disabled={createRefMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleAddRef()}
              loading={createRefMutation.isPending}
              disabled={createRefMutation.isPending || !refValue.trim()}
            >
              Save
            </Button>
          </div>
        }
      >
        <Field label="Ref" labelFor="post-set-ref">
          <Input
            id="post-set-ref"
            value={refValue}
            onChange={(event) => setRefValue(event.target.value)}
            placeholder="Enter ref"
            autoFocus
          />
        </Field>
      </Modal>
    </AppShell>
  );
}
