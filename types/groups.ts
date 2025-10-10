export interface GroupMember {
  id?: number;
  name: string;
}

export interface GroupRecord {
  id: number;
  name: string;
  color: string;
  rotationIndex: number;
  inRotation: boolean;
  members: GroupMember[];
}

export interface GroupFormPayload {
  name: string;
  color: string;
  members: string[];
  inRotation: boolean;
}
