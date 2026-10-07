import { useState } from 'react';
import Background from '../components/Background';
import useCredits from '../hooks/useCredits';
import { DISCORD_URL } from '../components/TopBanner';

const PLANS = [
  { name: 'Basic', monthly: 1.99, annual: 19.99, credits: 10, discount: 16 },
  { name: 'Essential', monthly: 3.99, annual: 36.99, credits: 25, discount: 23 },
  { name: 'Premium', monthly: 6.99, annual: 59.99, credits: 50, discount: 29 },
];

const CONVERTER_PRICE = 2.69;
const CONVERTER_CREDITS = 10;
const CONVERTER_MAX = 100;

export default function CreditsPage() {
  const { credits } = useCredits();
  const [annual, setAnnual] = useState(false);
  const [converterAmount, setConverterAmount] = useState(10);

  const converterCost = (converterAmount / CONVERTER_CREDITS) * CONVERTER_PRICE;

  return (
    <Background>
      <div className="w-full flex flex-col items-center px-4 sm:px-6 pt-8 pb-16">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Credits</h1>
            <p className="text-xl opacity-80 mt-2">You have <span className="font-bold text-warning">{credits ?? 0}</span> credits</p>
            <a className="btn btn-sm btn-ghost w-70 rounded-full border border-base-300 bg-base-200 shadow-sm" href='/app'>
              ← Back to my manuals
            </a>
          </div>

          <div className="flex justify-center mb-8">
            <div className="tabs tabs-boxed rounded-full p-1">
              <a className={`tab rounded-full h-min p-2 me-2 border border-gray-200 ${!annual ? 'tab-active bg-white' : 'bg-base-300'}`} onClick={() => setAnnual(false)}>Monthly</a>
              <a className={`tab rounded-full h-min p-2 border border-gray-200 ${annual ? 'tab-active bg-white' : 'bg-base-300'}`} onClick={() => setAnnual(true)}>Annual <span className='badge badge-sm badge-success mx-2'>Save up to 29%</span></a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-12">
            {PLANS.map((plan) => {
              const price = annual ? plan.annual : plan.monthly;
              const perCredit = annual ? price / plan.credits / 12 : price / plan.credits;
              return (
                <div key={plan.name} className="card bg-base-100 border border-base-300 shadow-lg rounded-3xl p-6 flex flex-col">
                  <h3 className="font-extrabold text-xl mb-1">{plan.name}</h3>
                  {annual && (
                    <span className="badge badge-success rounded-full text-xs font-bold mb-2 w-fit">Save {plan.discount}%</span>
                  )}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-extrabold">${price.toFixed(2)}</span>
                    <span className="text-sm opacity-60">/{annual ? 'year' : 'month'}</span>
                  </div>
                  <p className="text-sm opacity-50 mb-1">{annual ? plan.credits * 12 : plan.credits} credits/{annual ? 'year' : 'month'}<br/>{annual ? "you get " + plan.credits + " credits/month"  : ""}</p>
                  <p className="text-xs opacity-40 mb-4">${perCredit.toFixed(3)}/credit</p>
                  <a
                    href={DISCORD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary rounded-2xl text-amber-900 font-bold mt-auto"
                  >
                    Get {plan.name}
                  </a>
                </div>
              );
            })}
          </div>

          <div className="card bg-base-100 border border-base-300 shadow-lg rounded-3xl p-6 mb-8">
            <h3 className="font-extrabold text-xl mb-2">Buy standalone credits</h3>
            <p className="text-sm opacity-70 mb-4">One-time purchase, no subscription. Max {CONVERTER_MAX} credits per transaction.</p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={CONVERTER_CREDITS}
                  max={CONVERTER_MAX}
                  step={CONVERTER_CREDITS}
                  value={converterAmount}
                  onChange={e => setConverterAmount(Number(e.target.value))}
                  className="range range-warning w-48"
                />
                <span className="font-bold text-lg w-16 text-right">{converterAmount}</span>
              </div>
              <span className="text-sm opacity-60">credits</span>
              <span className="text-xl font-extrabold text-warning ml-auto">${converterCost.toFixed(2)}</span>
              <a
                href="https://discord.gg/manualist"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary rounded-2xl text-amber-900 font-bold"
              >
                Buy {converterAmount} credits
              </a>
            </div>
            <p className="text-xs opacity-50 mt-2">${(CONVERTER_PRICE / CONVERTER_CREDITS).toFixed(3)}/credit</p>
          </div>

          <div className="card bg-base-100 border border-base-300 shadow-lg rounded-3xl p-6 text-center">
            <h3 className="font-extrabold text-xl mb-2">How to purchase</h3>
            <p className="text-sm opacity-70 mb-4">
              Manualist is currently in beta. We don't have automated payments yet — instead, contact us on Discord and we'll set you up manually.
            </p>
            <p className="text-sm opacity-70 mb-4">
              Join our Discord server and ask in <span className="font-bold text-primary">#redeem-credits</span>. You can request any amount from 1 to 100 credits.
            </p>
            <a
              href="https://discord.gg/manualist"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary rounded-2xl text-amber-900 font-bold"
            >
              Join our Discord
            </a>
          </div>
        </div>
      </div>
    </Background>
  );
}
