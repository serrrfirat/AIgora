import { NextResponse } from 'next/server'
import { generateGladiator } from '@/app/create/actions'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const gladiator = await generateGladiator(formData)
    
    return NextResponse.json(gladiator)
  } catch (error) {
    console.error('Error generating gladiator:', error)
    return NextResponse.json(
      { error: 'Failed to generate gladiator' },
      { status: 500 }
    )
  }
} 