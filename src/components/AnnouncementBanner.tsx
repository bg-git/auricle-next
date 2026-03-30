export default function AnnouncementBanner() {
  return (
    <div
      style={{
        backgroundColor: '#181818',
        color: 'white',
        padding: '12px 16px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '500',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <img
        src="/shipping-icon.png"
        alt="Fast shipping"
        width="24"
        height="auto"
        style={{
          display: 'block',
          flexShrink: 0,
          filter: 'invert(1)',
        }}
      />
      All orders shipped next working day. Guaranteed
    </div>
  );
}
