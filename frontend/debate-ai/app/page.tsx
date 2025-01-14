'use client';

import { Suspense } from 'react';
import { CreateDebate } from '@/components/CreateDebate';
import { DebateList } from '@/components/DebateList';
import { GladiatorsGrid } from '@/components/gladiators-grid';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateGladiatorForm } from '@/components/create-gladiator-form';

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black border-b border-white/10 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">agora.ai</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-black border-0">
          <Tabs defaultValue="debates" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-black border border-white/10">
              <TabsTrigger 
                value="debates" 
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-sm md:text-base"
              >
                Active Debates
              </TabsTrigger>
              <TabsTrigger 
                value="gladiators"
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-sm md:text-base"
              >
                Gladiators
              </TabsTrigger>
              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-sm md:text-base"
              >
                Create Debate
              </TabsTrigger>
              <TabsTrigger 
                value="create-gladiator"
                className="data-[state=active]:bg-white data-[state=active]:text-black text-white text-sm md:text-base"
              >
                Create Gladiator
              </TabsTrigger>
            </TabsList>

            <TabsContent value="debates" className="p-0">
              <Suspense fallback={
                <div className="p-8 text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                  Loading debates...
                </div>
              }>
                <DebateList />
              </Suspense>
            </TabsContent>

            <TabsContent value="gladiators" className="p-0">
              <Suspense fallback={
                <div className="p-8 text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                  Loading gladiators...
                </div>
              }>
                <GladiatorsGrid />
              </Suspense>
            </TabsContent>

            <TabsContent value="create" className="p-0">
              <CreateDebate />
            </TabsContent>
            <TabsContent value="create-gladiator" className="p-0">
              <CreateGladiatorForm />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </main>
  );
}

