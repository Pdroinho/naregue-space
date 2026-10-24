import { api } from '../api'
import type { ReviewAction } from '../features/assistant/AssistantOperationDialog'
export async function prepareAssistantOperation(
  name: string,
  args: Record<string, unknown>,
): Promise<ReviewAction> {
  const res = await api<{ pendingAction: ReviewAction }>(
    '/api/admin/assistant/operations/prepare',
    { method: 'POST', body: JSON.stringify({ name, args }) },
  )
  if (!res.ok) throw Error(res.error.message)
  return res.data.pendingAction
}
