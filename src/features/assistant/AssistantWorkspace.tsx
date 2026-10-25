import { AssistantConversation } from '../../components/AssistantConversation'
import { AssistantCreditStatus } from './AssistantCreditStatus'
import './assistant-workspace.css'

export function AssistantWorkspace() {
  return (
    <section className="nr-assistant-workspace-layout">
      <AssistantCreditStatus />
      <section className="assistant34-page">
        <AssistantConversation variant="page" />
      </section>
    </section>
  )
}
