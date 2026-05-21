export class UserResponseDto {
  id!: string;
  email!: string;
  displayName!: string;
  createdAt!: string;
  families!: Array<{
    id: string;
    name: string;
    role: string;
    perms: string;
  }>;
}
