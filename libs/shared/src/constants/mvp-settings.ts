export type TieBreakStrategy = 'random_between_leaders' | 'initiator_decides';
export type TimeoutNoVotesStrategy = 'recommend_top1_with_revote';

export const MVP_SETTINGS = {
  voting: {
    duration: {
      minMinutes: 60,
      maxMinutes: 360,
      presetsMinutes: [60, 120, 180, 360] as const,
      defaultMinutes: 120,
    },

    participation: {
      requireJoinToVote: true,
      allowChangeVote: false,
      allowVoteWithoutJoin: false,
    },

    closing: {
      allowManualCloseByInitiator: true,
      allowAutoCloseWhenAllVoted: true,
      allowTimeoutClose: true,

      tieBreakOnManualClose: 'initiator_decides' as TieBreakStrategy,
      tieBreakOnTimeoutClose: 'random_between_leaders' as TieBreakStrategy,

      timeoutNoVotes: {
        strategy: 'recommend_top1_with_revote' as TimeoutNoVotesStrategy,
        messageStyle: 'soft_recommendation' as const,
        revoteAllowedFor: 'initiator_only' as const,
      },
    },

    reminders: {
      enabled: true,
      cooldownMinutes: 30,
    },
  },

  plan: {
    minJoinsToStartVoting: 2,
  },

  merchant: {
    inviteCode: {
      reusable: true,
      allowRotation: true,
    },
    defaultLandingZoneForMerchant: 'merchant' as const,
    allowMultiMerchantPerUser: true,
    sla: {
      targetResponseMinutes: 5,
    },
  },
} as const;
