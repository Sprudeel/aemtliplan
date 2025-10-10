export interface RotationItem {
  id: number | string;
  jobId?: number;
  jobName: string;
  jobIcon: string;
  iconType: "mdi" | "text";
  jobDescription: string;
  rotationPointer: number;
  groupName: string;
  groupColor: string;
  members: string[];
  nextGroupName?: string;
  nextGroupColor?: string;
  nextMembers?: string[];
}

export interface RotationPreviewGroup {
  id: number;
  name: string;
  color: string;
  members: string[];
}

export interface RotationPreviewJob {
  job: {
    id: number;
    name: string | null;
    icon: string | null;
    description: string | null;
    rotationPointer: number | null;
  };
  currentGroup: RotationPreviewGroup | null;
  nextGroup: RotationPreviewGroup | null;
}

export interface RotationPreviewResponse {
  step: number;
  totalJobs: number;
  jobs: RotationPreviewJob[];
}
