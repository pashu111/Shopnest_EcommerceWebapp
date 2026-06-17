import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Coins, Gift, Star, Crown, Trophy } from "lucide-react";

export default function Rewards() {
  const rewardCoins = useSelector((state) => state.reward.coins || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-yellow-400 px-6 py-3 rounded-2xl shadow-lg">
            <Coins size={32} className="text-yellow-800" />
            <div>
              <h1 className="text-4xl font-black text-yellow-900 tracking-tight">
                {rewardCoins.toLocaleString()}
              </h1>
              <p className="text-lg text-yellow-800 font-semibold uppercase tracking-wide">
                Reward Coins
              </p>
            </div>
          </div>
          <p className="text-xl text-gray-700 mt-4 max-w-md mx-auto">
            Earn coins on every order. Scratch to reveal instant rewards!
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link to="/home" className="group bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-amber-100 hover:-translate-y-2">
            <Gift className="w-12 h-12 text-amber-500 mx-auto mb-4 group-hover:scale-110 transition" />
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">Shop & Earn</h3>
            <p className="text-sm text-gray-600 text-center">Earn 5% coins on every purchase</p>
          </Link>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-amber-100 text-center">
            <div className="h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
              <Gift className="w-16 h-16 text-white opacity-75" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Daily Scratch</h3>
            <p className="text-sm text-gray-600">Coming Soon</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-2xl text-white shadow-xl">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-75" />
            <h3 className="text-lg font-bold mb-2 text-center">VIP Status</h3>
            <p className="text-sm text-center opacity-90">Reach 5000 coins for Premium</p>
            <div className="w-full bg-white/20 rounded-full h-2 mt-4">
              <div 
                className="bg-white h-2 rounded-full transition-all" 
                style={{ width: `${Math.min((rewardCoins / 5000) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-xl">
            <Crown className="w-12 h-12 mx-auto mb-4 opacity-75" />
            <h3 className="text-lg font-bold mb-2 text-center">Redeem</h3>
            <p className="text-sm text-center opacity-90">Coming Soon</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Trophy className="text-amber-500" />
            Recent Rewards
          </h2>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Your rewards history will appear here</p>
            <p className="text-sm mt-2 opacity-75">Earn more by shopping!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
