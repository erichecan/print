import AdminUserDetailClient from './AdminUserDetailClient';

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  return <AdminUserDetailClient id={params.id} />;
}
