import { Suspense } from 'react';
import { CreateDebate } from '@/components/CreateDebate';
import { DebateList } from '@/components/DebateList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <div className="flex flex-col items-center justify-center min-h-screen py-2">
        <h1 className="text-4xl font-bold mb-8">AI Debate Platform</h1>

        <Card className="w-full max-w-4xl">
          <Tabs defaultValue="debates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="debates">Active Debates</TabsTrigger>
              <TabsTrigger value="create">Create Debate</TabsTrigger>
            </TabsList>

            <TabsContent value="debates">
              <Suspense fallback={<div>Loading debates...</div>}>
                <DebateList />
              </Suspense>
            </TabsContent>

            <TabsContent value="create">
              <CreateDebate />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </main>
  );
}

