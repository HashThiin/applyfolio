-- 003: 投递状态流程重构
-- 旧: applied/written/interview/offer/rejected/withdrawn
-- 新: applied(投递) → screening(简历初筛) → assessment(测评) → ai_interview(AI面)
--     → written(笔试) → group_interview(群面) → interview(面试) → offer
--     + rejected(已挂) / withdrawn(已放弃)
-- 旧值全部是新值的子集，历史数据不会丢失。

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications
  ADD CONSTRAINT applications_status_check CHECK (
    status IN (
      'applied','screening','assessment','ai_interview',
      'written','group_interview','interview','offer',
      'rejected','withdrawn'
    )
  );
