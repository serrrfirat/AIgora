import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  // In a real application, you'd fetch this data from a database
  const debates = [
    { id: 1, title: "Will AI surpass human intelligence by 2030?", participants: 120 },
    { id: 2, title: "Is cryptocurrency the future of finance?", participants: 85 },
    { id: 3, title: "Should we colonize Mars in the next decade?", participants: 200 },
  ]

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8">AI Debate Platform</h1>
      <Link href="/create-debate">
        <Button className="mb-8">Create Debate</Button>
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {debates.map((debate) => (
          <Card key={debate.id}>
            <CardHeader>
              <CardTitle>{debate.title}</CardTitle>
              <CardDescription>{debate.participants} participants</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/debate/${debate.id}`}>
                <Button variant="outline">Join Debate</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}

