import { AssistantConversation } from '../../components/AssistantConversation'
import { AssistantCreditStatus } from './AssistantCreditStatus'
import './assistant-workspace.css'

export function AssistantWorkspace() {
  return (
    <section className="assistant-workspace">
      <AssistantCreditStatus />
      <section className="assistant34-page">
        <AssistantConversation variant="page" />
      </section>
    </section>
  )
}
