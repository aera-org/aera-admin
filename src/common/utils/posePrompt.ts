import { PhotoAngle, Pose } from '../types';

export const PHOTO_ANGLE_LABELS: Record<PhotoAngle, string> = {
  [PhotoAngle.Pov]: 'POV',
  [PhotoAngle.Closeup]: 'Closeup',
  [PhotoAngle.Topdown]: 'Top Down',
  [PhotoAngle.Front]: 'Front',
  [PhotoAngle.Back]: 'Back',
  [PhotoAngle.Side]: 'Side',
};

export const POSE_LABELS: Record<Pose, string> = {
  [Pose.LegsSpread]: 'Legs Spread',
  [Pose.Masturbation]: 'Masturbation',
  [Pose.Cumshot]: 'Cumshot',
  [Pose.LegRaised]: 'Leg Raised',
  [Pose.Creampie]: 'Creampie',
  [Pose.Squirting]: 'Squirting',
  [Pose.Blowjob]: 'Blowjob',
  [Pose.Handjob]: 'Handjob',
  [Pose.Titjob]: 'Titjob',
  [Pose.Cowgirl]: 'Cowgirl',
  [Pose.Doggy]: 'Doggy',
  [Pose.Missionary]: 'Missionary',
  [Pose.Footjob]: 'Footjob',
  [Pose.LegsUp]: 'Legs Up',
};

export const photoAngleOptions = Object.values(PhotoAngle).map((value) => ({
  value,
  label: PHOTO_ANGLE_LABELS[value],
}));

export const poseOptions = Object.values(Pose).map((value) => ({
  value,
  label: POSE_LABELS[value],
}));

export function formatPhotoAngle(value: PhotoAngle | null | undefined) {
  return value ? PHOTO_ANGLE_LABELS[value] : '-';
}

export function formatPose(value: Pose | null | undefined) {
  return value ? POSE_LABELS[value] : '-';
}
