import AdminDesignDetailClient from './AdminDesignDetailClient';

export async function generateStaticParams() {
  return [];
}

export default function AdminDesignReviewPage({ params }: { params: { id: string } }) {
  return <AdminDesignDetailClient id={params.id} />;
}
