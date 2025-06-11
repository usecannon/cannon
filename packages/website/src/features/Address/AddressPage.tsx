import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ClipboardButton } from '@/components/ClipboardButton';

const AddressPage = () => {
  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 my-4">
      <div className="flex items-baseline space-x-4">
        <h1 className="text-2xl font-bold">Address</h1>
        <span className="">0xE0707EB3a3f115Be661B2ABFb73b511C61301554</span>
        <ClipboardButton text="" />
      </div>
      <hr className="opacity-75 my-3" />
      <div className="flex sm:flex-row flex-col gap-3">
        <Card className="rounded-sm w-full">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center">
              <span className="text-gray-400 text-sm mr-2">Contracts:</span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm w-full">
          <CardHeader>
            <CardTitle>More Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center">
              <span className="text-gray-400 text-sm mr-2">Contracts:</span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm w-full">
          <CardHeader>
            <CardTitle>Multichain Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center">
              <span className="text-gray-400 text-sm mr-2">Contracts:</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex w-full my-3">
        <Card className="rounded-sm w-full">
          <CardHeader>
            <CardTitle>Transaction Lists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center">
              <span className="text-gray-400 text-sm mr-2">Contracts:</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddressPage;
