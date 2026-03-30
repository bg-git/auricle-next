export default function AnnouncementBanner() {
  return (
    <div
      style={{
        backgroundColor: '#181818',
        color: 'white',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '500',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        lineHeight: '1',
      }}
    >
      <img
        src="/shipping-icon.png"
        alt="Fast shipping"
        width="20"
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
