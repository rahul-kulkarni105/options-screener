import {
  Activity,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Crosshair,
  Database,
  FileText,
  HelpCircle,
  LineChart,
  ListChecks,
  NotebookText,
  Play,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  Wallet
} from "lucide-react";
import { useMemo, useState } from "react";
import { Metric } from "../../components/Metric.jsx";
import { Panel } from "../../components/Panel.jsx";
import { money, pct } from "../../lib/format.js";

const workflowSteps = [
  {
    icon: SlidersHorizontal,
    title: "Choose rules",
    text: "Pick the symbols, expiry, filters, and risk limits the screener should use."
  },
  {
    icon: Play,
    title: "Screen picks",
    text: "Click once. The app fetches data and looks for spreads that match your rules."
  },
  {
    icon: Search,
    title: "Read results",
    text: "Ranked Spreads shows what passed. Skipped Symbols explains what failed."
  },
  {
    icon: ShieldCheck,
    title: "Review risk",
    text: "Select ideas and check whether the combined risk fits your account limits."
  },
  {
    icon: Crosshair,
    title: "Track and journal",
    text: "Save ideas locally, update them over time, and review your decisions later."
  }
];

const dashboardGroups = [
  {
    id: "setup",
    title: "Set Up",
    description: "These panels decide what the screener is allowed to look for.",
    sections: [
      {
        id: "presets",
        icon: BookOpen,
        title: "Strategy Presets",
        simple: "Starting recipes for the settings form.",
        doThis: "Use one when you do not know where to begin, then adjust it.",
        detail:
          "Presets copy values into the visible settings. They are not recommendations and they do not change the screening formula."
      },
      {
        id: "rules",
        icon: SlidersHorizontal,
        title: "Strategy Rules",
        simple: "The main filter list: symbols, expiry, delta, credit, width, and liquidity.",
        doThis: "Change these when too many or too few spreads pass.",
        detail:
          "This is where you control what counts as a valid spread. The screener waits until you click Screen Picks before using changes."
      },
      {
        id: "market-risk",
        icon: Wallet,
        title: "Market & Risk Rules",
        simple: "Market safety checks plus account-size limits.",
        doThis: "Keep these conservative while learning.",
        detail:
          "Trend and VIX gates can block rough market setups. Risk values power suggested contracts and Review Trades warnings."
      },
      {
        id: "export-import",
        icon: Database,
        title: "Export / Import",
        simple: "Backup and restore local settings, presets, positions, and journal data.",
        doThis: "Export before big changes or before moving browsers.",
        detail:
          "The app stores your personal data in this browser only. Export creates a JSON backup you can import later."
      }
    ]
  },
  {
    id: "inspect",
    title: "Run & Inspect",
    description: "These panels explain what happened after the screening run.",
    sections: [
      {
        id: "auto-events",
        icon: Activity,
        title: "Auto Events",
        simple: "Shows earnings, macro events, and VIX context before expiry.",
        doThis: "Check this before trusting a clean-looking candidate.",
        detail:
          "Earnings can block symbols. Macro events can warn or block depending on your settings. VIX helps describe the volatility backdrop."
      },
      {
        id: "freshness",
        icon: Database,
        title: "Source Freshness",
        simple: "Shows which public data sources were used for the last run.",
        doThis: "Use it when results look stale, empty, or surprising.",
        detail:
          "The app uses public or delayed data. Sources can fail, be delayed, or return incomplete information."
      },
      {
        id: "ranked",
        icon: LineChart,
        title: "Ranked Spreads",
        simple: "The spreads that survived the filters, sorted by score.",
        doThis: "Start here after a run, but do not treat the top card as a command.",
        detail:
          "Cards show credit, max loss, breakeven, liquidity, distance, warnings, and a copyable order-ticket text."
      },
      {
        id: "skipped",
        icon: ListChecks,
        title: "Skipped Symbols",
        simple: "The debugging panel for symbols that did not pass.",
        doThis: "If nothing passes, read this before changing random settings.",
        detail:
          "Common reasons include weak trend, earnings, bad quotes, low liquidity, delta outside range, width, or too little credit."
      }
    ]
  },
  {
    id: "decide",
    title: "Decide Carefully",
    description: "These panels help you slow down before doing anything manual.",
    sections: [
      {
        id: "review",
        icon: ShieldCheck,
        title: "Review Trades",
        simple: "A rehearsal space for risk before you track or copy anything.",
        doThis: "Select spreads in Ranked Spreads, then check this panel.",
        detail:
          "It combines selected ideas with open tracked positions and warns about weekly, symbol, and correlation-group exposure."
      },
      {
        id: "tickets",
        icon: Ticket,
        title: "Order Tickets",
        simple: "Copyable text for manual order entry.",
        doThis: "Use only after you understand the trade and verify it elsewhere.",
        detail:
          "The app never sends orders to a broker. Ticket text is convenience text, not an execution instruction."
      }
    ]
  },
  {
    id: "follow-up",
    title: "Follow Up",
    description: "These panels help you learn from what you chose to track.",
    sections: [
      {
        id: "positions",
        icon: Crosshair,
        title: "Position Monitor",
        simple: "Browser-local tracking for spreads you chose to follow.",
        doThis: "Update status, notes, and manual values as the idea changes.",
        detail:
          "Tracked positions are local records. They are not connected to your brokerage account and cannot manage real trades."
      },
      {
        id: "journal",
        icon: NotebookText,
        title: "Trade Journal",
        simple: "A local review board for your tracked decisions.",
        doThis: "Use it to notice patterns in your own choices.",
        detail:
          "The journal uses local tracked-position history so you can review outcomes and notes without sending data anywhere."
      }
    ]
  }
];

const glossary = [
  {
    term: "Put credit spread",
    definition:
      "Sell a put, buy a lower put, collect credit, and cap the worst-case loss. You generally want the stock to stay above breakeven."
  },
  {
    term: "Credit",
    definition:
      "Money collected to open the spread. The app estimates it conservatively from tradable quotes."
  },
  {
    term: "Max loss",
    definition:
      "The most one contract can lose before fees: spread width minus credit, multiplied by 100."
  },
  {
    term: "Delta",
    definition:
      "A sensitivity number. In this app, lower put delta usually means a strike farther below the stock price."
  },
  {
    term: "Open interest",
    definition:
      "How many contracts already exist. Higher open interest often means the option is easier to trade."
  },
  {
    term: "VIX",
    definition:
      "A broad volatility gauge. Very low VIX can mean thin option premium; very high VIX can mean unstable markets."
  },
  {
    term: "Expected move",
    definition:
      "A rough volatility-based estimate of how far a stock might move by expiry. It is not a promise."
  }
];

const safetyNotes = [
  "This app is a screener, not financial advice.",
  "Public or delayed data can be wrong, stale, or incomplete.",
  "Suggested contracts are sizing math, not a safety guarantee.",
  "Copying a ticket does not mean the trade is appropriate.",
  "Start with paper trading or study before using real money."
];

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function SectionIntro({ eyebrow, title, children }) {
  return (
    <div className="learn-section-intro">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

function WorkflowSteps() {
  return (
    <Panel className="learn-wide" title="Dashboard In 5 Steps">
      <div className="learn-flow">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article className="learn-flow-card" key={step.title}>
              <div className="learn-flow-card__number">{index + 1}</div>
              <Icon size={18} />
              <div>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function DashboardTour() {
  const [openSection, setOpenSection] = useState("rules");

  return (
    <section className="learn-wide">
      <SectionIntro eyebrow="Dashboard tour" title="What Every Panel Does">
        Read the short version first. Open details only when you want the next layer.
      </SectionIntro>
      <div className="learn-panel-groups">
        {dashboardGroups.map((group) => (
          <Panel className="learn-panel-group" key={group.id} title={group.title}>
            <p className="learn-copy">{group.description}</p>
            <div className="learn-panel-list">
              {group.sections.map((section) => {
                const Icon = section.icon;
                const isOpen = openSection === section.id;
                return (
                  <article className="learn-panel-item" key={section.id}>
                    <button
                      aria-expanded={isOpen}
                      className="learn-panel-item__button"
                      type="button"
                      onClick={() => setOpenSection(isOpen ? "" : section.id)}
                    >
                      <Icon size={17} />
                      <span>{section.title}</span>
                      <ChevronDown className={isOpen ? "is-open" : ""} size={16} />
                    </button>
                    <div className="learn-panel-item__body">
                      <p>{section.simple}</p>
                      <strong>Do this: {section.doThis}</strong>
                      {isOpen ? <span>{section.detail}</span> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}

function SpreadMiniLab() {
  const [stockPrice, setStockPrice] = useState(100);
  const [shortStrike, setShortStrike] = useState(94);
  const [width, setWidth] = useState(5);
  const [credit, setCredit] = useState(1.2);
  const longStrike = shortStrike - width;
  const maxLoss = (width - credit) * 100;
  const breakeven = shortStrike - credit;
  const distancePct = (stockPrice - shortStrike) / stockPrice;
  const creditPct = credit / width;

  function updateWidth(value) {
    const nextWidth = clampNumber(value, 1, 10);
    setWidth(nextWidth);
    setShortStrike((current) => Math.max(current, nextWidth + 1));
    setCredit((current) => Math.min(current, nextWidth - 0.05));
  }

  return (
    <Panel className="learn-wide learn-lab" title="Try A Fake Spread">
      <p className="learn-copy">
        This is not market data. It is a small calculator that makes the dashboard numbers less
        mysterious.
      </p>
      <div className="learn-lab__controls">
        <label>
          <span>Stock price</span>
          <input
            max="160"
            min="50"
            type="range"
            value={stockPrice}
            onChange={(event) => {
              const nextPrice = Number(event.target.value);
              setStockPrice(nextPrice);
              setShortStrike((current) => Math.min(current, nextPrice - 1));
            }}
          />
          <strong>{money(stockPrice)}</strong>
        </label>
        <label>
          <span>Short put strike</span>
          <input
            max={stockPrice - 1}
            min={width + 1}
            type="range"
            value={shortStrike}
            onChange={(event) =>
              setShortStrike(clampNumber(event.target.value, width + 1, stockPrice - 1))
            }
          />
          <strong>{money(shortStrike)}</strong>
        </label>
        <label>
          <span>Spread width</span>
          <input
            max="10"
            min="1"
            step="0.5"
            type="range"
            value={width}
            onChange={(event) => updateWidth(event.target.value)}
          />
          <strong>{money(width)}</strong>
        </label>
        <label>
          <span>Credit collected</span>
          <input
            max={Math.max(0.05, width - 0.05)}
            min="0.05"
            step="0.05"
            type="range"
            value={credit}
            onChange={(event) => setCredit(clampNumber(event.target.value, 0.05, width - 0.05))}
          />
          <strong>{money(credit)}</strong>
        </label>
      </div>
      <div className="summary-grid">
        <Metric label="Long put" value={money(longStrike)} />
        <Metric
          label="Credit % width"
          value={pct(creditPct)}
          tone={creditPct >= 0.25 ? "good" : "warn"}
        />
        <Metric label="Max loss / contract" value={money(maxLoss)} />
        <Metric label="Breakeven" value={money(breakeven)} />
        <Metric label="Distance OTM" value={pct(distancePct)} />
        <Metric
          label="Plain English"
          value={`The stock needs to stay above ${money(breakeven)}.`}
        />
      </div>
    </Panel>
  );
}

function Glossary() {
  const [activeTerm, setActiveTerm] = useState(glossary[0].term);
  const active = useMemo(
    () => glossary.find((item) => item.term === activeTerm) || glossary[0],
    [activeTerm]
  );

  return (
    <Panel className="learn-wide" title="Plain-English Glossary">
      <div className="learn-glossary">
        <div className="learn-term-list">
          {glossary.map((item) => (
            <button
              className={item.term === active.term ? "learn-term is-active" : "learn-term"}
              key={item.term}
              type="button"
              onClick={() => setActiveTerm(item.term)}
            >
              {item.term}
            </button>
          ))}
        </div>
        <div className="learn-term-detail">
          <HelpCircle size={22} />
          <div>
            <strong>{active.term}</strong>
            <p>{active.definition}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function SafetyNotes() {
  return (
    <Panel className="learn-wide" title="Safety Notes">
      <div className="learn-safety-list">
        {safetyNotes.map((note) => (
          <div className="learn-safety-item" key={note}>
            <AlertTriangle size={15} />
            <span>{note}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function LearnPage() {
  return (
    <main className="learn-page">
      <section className="learn-intro">
        <div>
          <p className="learn-kicker">Start here</p>
          <h2>A beginner path through the whole dashboard.</h2>
          <p>
            The app screens stocks and options for possible weekly put credit spreads. Your job is
            to choose rules, run the screen, read what passed or failed, review risk, and track only
            what you understand.
          </p>
        </div>
        <div className="learn-warning">
          <AlertTriangle size={18} />
          <span>
            Learning mode explains the tool. It does not make any spread safe or appropriate for
            real money.
          </span>
        </div>
      </section>

      <section className="learn-start-card">
        <FileText size={20} />
        <div>
          <strong>The shortest useful version</strong>
          <p>
            Settings are filters. Screen Picks runs the filters. Ranked Spreads shows survivors.
            Skipped Symbols explains rejects. Review Trades checks whether selected ideas fit your
            risk limits.
          </p>
        </div>
      </section>

      <div className="learn-grid">
        <WorkflowSteps />
        <DashboardTour />
        <SpreadMiniLab />
        <Glossary />
        <SafetyNotes />
      </div>
    </main>
  );
}
