import mongoose from "mongoose";

const rewardSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    rewardType:{
        type: String,
        enum: ["coins","coupon","badge"],
        default: "coins",
    },
    amount:{
        type: Number,
        required: true,
    },
    amount:{
        type: Number,
        required: true,
    },
    dataEarned:{
        type: Date,
        default: Date.now,
    },

});

export default mongoose.model("Reward", rewardSchema);


