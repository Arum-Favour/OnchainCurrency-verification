import { NextResponse } from 'next/server';

export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
