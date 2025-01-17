import UserBio from '@/app/ui/users/user-bio';
import { User } from 'prisma/prisma-client';
import { getUserById } from '@/app/lib/data';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/app/ui/users/users.css';
export const metadata: Metadata = {
  title: 'Successful Signup',
  description: 'Another successful signup',
};

export default async function Page({ params }: { params: { id: string } }) {
  const user = (await getUserById(Number(params.id))) as User;
  if (!user) {
    console.log('User not found');
    notFound();
  } else {
    console.log('User Found');
  }

  return (
    <div className="center-children">
      <span
        style={{
          textAlign: 'center',
        }}
      >
        Congratulations {user.displayName}, You&apos;ve successfully logged in.
      </span>
    </div>
  );
}
