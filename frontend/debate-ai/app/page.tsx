'use client';

import { Suspense } from 'react';
import { CreateDebate } from '@/components/CreateDebate';
import { DebateList } from '@/components/DebateList';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col items-center justify-center min-h-screen py-2">
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">agora.ai</h1>
          </div>

          <Card className="w-full">
            <Tabs defaultValue="debates" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="debates">Active Debates</TabsTrigger>
                <TabsTrigger value="create">Create Debate</TabsTrigger>
              </TabsList>

              <TabsContent value="debates">
                <Suspense fallback={<div className="p-4 text-center">Loading debates...</div>}>
                  <DebateList />
                </Suspense>
              </TabsContent>

              <TabsContent value="create">
                <CreateDebate />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </main>
  );
}

