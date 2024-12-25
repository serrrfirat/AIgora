'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { calculateInitialBond } from '@/lib/bonding-curve'

export default function CreateDebate() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [timeLimit, setTimeLimit] = useState('60')
  const [timeUnit, setTimeUnit] = useState('minutes')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const timeLimitInMinutes = parseInt(timeLimit) * (timeUnit === 'hours' ? 60 : timeUnit === 'days' ? 1440 : 1)
    const initialBond = calculateInitialBond(timeLimitInMinutes)
    
    // In a real application, you'd send this data to your backend
    console.log({ title, description, timeLimitInMinutes, initialBond })
    
    // Redirect to the home page after submission
    router.push('/')
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Create a New Debate</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Debate Title</label>
          <Input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="flex space-x-4">
          <div className="flex-1">
            <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">Time Limit</label>
            <Input
              type="number"
              id="timeLimit"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              required
              min="1"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="timeUnit" className="block text-sm font-medium text-gray-700">Time Unit</label>
            <Select value={timeUnit} onValueChange={setTimeUnit}>
              <SelectTrigger id="timeUnit">
                <SelectValue placeholder="Select time unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit">Create Debate</Button>
      </form>
    </div>
  )
}

