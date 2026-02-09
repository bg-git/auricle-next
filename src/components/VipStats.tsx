import { useEffect, useState } from 'react';

type VipStatsData = {
  totalSavings: number;
  averageSavings: number;
  orderCount: number;
  currency: string;
};

export default function VipStats() {
  const [stats, setStats] = useState<VipStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/vip/stats');
        if (!res.ok) {
          throw new Error('Failed to fetch VIP stats');
        }

        const data = (await res.json()) as VipStatsData;
        setStats(data);
      } catch (err) {
        console.error('Error fetching VIP stats:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (error || !stats) {
    return null;
  }

  const currencySymbol = stats.currency === 'GBP' ? '£' : '$';

  return (
    <section className="vip-stats">
      <div className="vip-stats__container">
        <h2 className="vip-stats__title">VIP MEMBER SAVINGS</h2>

        <div className="vip-stats__grid">
          {loading ? (
            <>
              <div className="vip-stats__card">
                <div className="vip-stats__value vip-stats__skeleton" />
                <div className="vip-stats__label vip-stats__skeleton vip-stats__skeleton--label" />
                <div className="vip-stats__sublabel vip-stats__skeleton vip-stats__skeleton--sublabel" />
              </div>

              <div className="vip-stats__card">
                <div className="vip-stats__value vip-stats__skeleton" />
                <div className="vip-stats__label vip-stats__skeleton vip-stats__skeleton--label" />
                <div className="vip-stats__sublabel vip-stats__skeleton vip-stats__skeleton--sublabel" />
              </div>
            </>
          ) : (
            <>
              <div className="vip-stats__card">
                <div className="vip-stats__value">
                  {currencySymbol}
                  {stats.totalSavings.toLocaleString('en-GB', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="vip-stats__label">Total Savings</div>
                <div className="vip-stats__sublabel">Across all VIP members</div>
              </div>

              <div className="vip-stats__card">
                <div className="vip-stats__value">
                  {currencySymbol}
                  {stats.averageSavings.toLocaleString('en-GB', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="vip-stats__label">Average Savings</div>
                <div className="vip-stats__sublabel">Per order</div>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .vip-stats {
          padding: 60px 20px;
          background: linear-gradient(135deg, #f9f9f9 0%, #fcfcfc 100%);
          border-top: 1px solid #e9e9e9;
          border-bottom: 1px solid #e9e9e9;
          min-height: 280px;
          display: flex;
          align-items: center;
        }

        .vip-stats__container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .vip-stats__title {
          font-size: 28px;
          font-weight: 600;
          text-align: center;
          margin: 0 0 40px 0;
          color: #222;
          letter-spacing: -0.5px;
        }

        .vip-stats__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin: 0 auto;
        }

        .vip-stats__card {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          text-align: center;
          transition: box-shadow 0.3s ease;
          min-height: 150px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .vip-stats__card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }

        .vip-stats__value {
          font-size: 32px;
          font-weight: 700;
          color: #000;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
          min-height: 40px;
        }

        .vip-stats__label {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 4px 0;
          min-height: 18px;
        }

        .vip-stats__sublabel {
          font-size: 12px;
          color: #999;
          margin: 0;
          min-height: 16px;
        }

        .vip-stats__skeleton {
          background: linear-gradient(90deg, #e9e9e9 25%, #f0f0f0 50%, #e9e9e9 75%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
          border-radius: 4px;
        }

        .vip-stats__skeleton--label {
          height: 14px;
          margin-top: 8px;
        }

        .vip-stats__skeleton--sublabel {
          height: 12px;
          margin-top: 4px;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @media (max-width: 768px) {
          .vip-stats {
            padding: 40px 20px;
            min-height: 240px;
          }

          .vip-stats__title {
            font-size: 22px;
            margin-bottom: 30px;
          }

          .vip-stats__value {
            font-size: 28px;
          }
        }
      `}</style>
    </section>
  );
}
