import { component, commit, cleanup } from 'auwla';
import { css } from 'auwla/css';
import * as styles from './styles';

export function Dashboard() {
  const self = component();

  let chartFilter: 'daily' | 'monthly' = 'daily';
  let responseTime = 45;
  let serverStatus: 'online' | 'warning' | 'offline' = 'online';

  // Periodically simulate response time fluctuations and latency spikes
  const timer = setInterval(() => {
    const change = Math.floor(Math.random() * 15) - 7;
    responseTime = Math.max(10, Math.min(250, responseTime + change));

    if (responseTime > 150) {
      serverStatus = 'warning';
    } else {
      serverStatus = 'online';
    }
    commit(self); // Triggers update for the background interval
  }, 3000);

  cleanup(() => {
    clearInterval(timer);
  });

  // SVG Chart Mock Data
  const dailyData = [20, 45, 28, 80, 99, 43, 60];
  const monthlyData = [40, 60, 50, 75, 90, 85, 110];

  const isDaily = ()=> chartFilter === 'daily';
  const dataPoints = isDaily() ? dailyData : monthlyData;

  // Generate SVG path coordinate points
  const width = 600;
  const height = 150;
  const stepX = width / (dataPoints.length - 1);
  const maxVal = Math.max(...dataPoints);
  const minVal = Math.min(...dataPoints);
  const spread = maxVal - minVal || 1;

  const points = dataPoints.map((val, index) => {
    const x = index * stepX;
    const y = height - ((val - minVal) / spread) * (height - 30) - 15;
    return { x, y };
  });

   const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  return () => (
      <div style={css(styles.mainContent)}>
        <div style={css(styles.flexRow)}>
          <div>
            <h1 style={css(styles.headerTitle)}>Analytics Dashboard</h1>
            <p style={css(styles.headerDesc)}>Real-time telemetry and overview.</p>
          </div>
          <div style={css(styles.headerTelemetryRow)}>
            <span style={css(styles.statusDot({ status: serverStatus }))} />
            <span style={css(styles.headerTelemetry)}>
              System: {serverStatus.toUpperCase()} ({responseTime}ms)
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={css(styles.metricsGrid)}>
          <div style={css(styles.metricCard)}>
            <span style={css(styles.metricLabel)}>TOTAL VISITORS</span>
            <div style={css(styles.metricValue)}>12,482</div>
            <span style={css(styles.metricTrend({ variant: 'up' }))}>+12.4% vs last week</span>
          </div>
          <div style={css(styles.metricCard)}>
            <span style={css(styles.metricLabel)}>CONVERSIONS</span>
            <div style={css(styles.metricValue)}>8.42%</div>
            <span style={css(styles.metricTrend({ variant: 'up' }))}>+2.1% this month</span>
          </div>
          <div style={css(styles.metricCard)}>
            <span style={css(styles.metricLabel)}>AVG RESPONSE TIME</span>
            <div style={css(styles.metricValue)}>{responseTime}ms</div>
            <span style={css(styles.metricTrend({ variant: responseTime > 150 ? 'down' : 'online' }))}>
              {responseTime > 150 ? 'High latency spike' : 'System healthy'}
            </span>
          </div>
        </div>

        {/* Dynamic Chart Glass Panel */}
        <div style={css(styles.glassPanel)}>
          <div style={css(styles.chartHeader)}>
            <div>
              <h3 style={css(styles.chartTitle)}>Traffic Growth</h3>
              <p style={css(styles.chartSubtitle)}>Visualizing visitor flow trends.</p>
            </div>
            <div style={css(styles.filterGroup)}>
              <button
                style={css(styles.btn({ variant: isDaily() ? 'primary' : 'outline' }))}
                onClick={() => { chartFilter = 'daily'; }}
              >
                Daily
              </button>
              <button
                style={css(styles.btn({ variant: !isDaily() ? 'primary' : 'outline' }))}
                onClick={() => { chartFilter = 'monthly'; }}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div style={css(styles.chartContainer)}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              style={css(styles.chartSvg)}
            >
              {/* Grid Lines */}
              <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="0" y1={height - 15} x2={width} y2={height - 15} stroke="rgba(255,255,255,0.06)" />

              {/* Area Under Curve */}
              <path
                d={`${pathData} L ${points[points.length - 1]!.x},${height} L 0,${height} Z`}
                fill={`url(#chart-gradient)`}
                opacity="0.15"
                style={css(styles.chartArea)}
              />

              {/* Line Path */}
              <path
                d={pathData}
                fill="none"
                stroke={`url(#line-gradient)`}
                strokeWidth="3"
                strokeLinecap="round"
                style={css(styles.chartLine)}
              />

              {/* Data Points */}
              <g>
                {points.map((p) => (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    fill="#fff"
                    strokeWidth="2"
                    style={css(styles.chartPoint)}
                  />
                ))}
              </g>

              {/* Gradients */}
              <defs>
                <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="oklch(0.62 0.18 290)" />
                  <stop offset="100%" stopColor="oklch(0.72 0.16 195)" />
                </linearGradient>
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.62 0.18 290)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="oklch(0.62 0.18 290)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    );
}
