import { useState, useEffect } from 'react';
import { subscriptionService, PlanItem, SubscriptionItem } from '../services/subscriptionService';

export const useSubscription = () => {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlans = async () => {
    try {
      const data = await subscriptionService.getPlans();
      setPlans(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMySubscriptions = async () => {
    setLoading(true);
    try {
      const data = await subscriptionService.getMySubscriptions();
      setMySubscriptions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const activeSubscription = mySubscriptions.find(s => s.status === 'active') || null;

  return {
    plans,
    mySubscriptions,
    activeSubscription,
    loading,
    fetchPlans,
    fetchMySubscriptions
  };
};
