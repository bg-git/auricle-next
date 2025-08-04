import { Html, Head, Preview, Body, Container, Heading, Text, Hr } from '@react-email/components';

type ChatTranscriptProps = {
  name?: string;
  messages: { sender: 'ME' | 'AURICLE', text: string }[];
};

export default function ChatTranscript({ name, messages }: ChatTranscriptProps) {
  return (
    <Html>
      <Head />
      <Preview>Your AURICLE chat transcript</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9f9f9' }}>
        <Container style={{ background: '#fff', padding: '24px', maxWidth: '600px', borderRadius: '8px', margin: 'auto' }}>
          <Heading style={{ marginBottom: '8px' }}>
            Hello{name ? ` ${name}` : ''}, here’s a copy of your recent chat with us
          </Heading>

          {messages.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: '12px' }}>
              <Text style={{ margin: 0 }}><strong>{msg.sender}:</strong> {msg.text}</Text>
            </div>
          ))}

          <Hr style={{ margin: '24px 0' }} />

          <Text style={{ fontSize: '14px', color: '#777' }}>
            If you still need help, just reply to this email or visit us at <a href="https://auricle.co.uk">auricle.co.uk</a>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
