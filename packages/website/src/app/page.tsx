'use client';
import HomePage from '@/Features/HomePage/HomePage';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Cannon</title>
        <meta name="title" content="Cannon" />
      </Head>
      <HomePage />
    </>
  );
}
