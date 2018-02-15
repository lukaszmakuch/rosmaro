import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import {compose as Rcompose, identity as Ridentity, lens as Rlens} from 'ramda';

export default plan => {
  const remainingPlan = omit(plan, ['initCtx']);
  const initCtx = plan.initCtx || {};

  return {
    remainingPlan,
    make: (next) => ({

      ...next,

      lens: opts => Rcompose(
        Rlens(
          ctx => isEmpty(ctx) ? initCtx : ctx,
          Ridentity
        ),
        next.lens(opts)
      )

    })
  };
};