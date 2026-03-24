/**
 * auction-utils.js
 * Helpers for auction display formatting
 */

function getTimeRemaining(endDateStr) {
  if (!endDateStr) return null;
  
  const now = new Date();
  const endDate = new Date(endDateStr);
  const diffMs = endDate - now;
  
  if (diffMs <= 0) return { display: 'Ended', color: '#94a3b8', urgent: false };
  
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;
  
  if (diffHours < 2) {
    // Under 2 hours — urgent red
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const hrs = Math.floor(diffHours);
    return {
      display: hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`,
      color: '#E24B4A',
      urgent: true
    };
  } else if (diffHours < 24) {
    // Under 24 hours — amber
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      display: `${Math.floor(diffHours)}h ${mins}m`,
      color: '#BA7517',
      urgent: false
    };
  } else {
    // Multiple days — grey
    return {
      display: `${Math.floor(diffDays)}d ${Math.floor(diffHours % 24)}h`,
      color: '#64748b',
      urgent: false
    };
  }
}

function formatBidCount(count) {
  if (count === 0) return { display: '0 bids', flag: true };
  if (count === 1) return { display: '1 bid', flag: false };
  return { display: `${count} bids`, flag: false };
}

function getTrustBadge(feedbackPercent, salesCount) {
  const fb = typeof feedbackPercent === 'number' ? feedbackPercent : parseFloat(feedbackPercent) || 0;
  const sales = typeof salesCount === 'number' ? salesCount : parseInt(salesCount) || 0;
  
  if (fb >= 98 && sales >= 500) {
    return {
      display: 'Trusted',
      color: '#1D9E75',
      bg: '#E1F5EE'
    };
  } else if (fb >= 95 || sales >= 100) {
    return {
      display: 'OK',
      color: '#BA7517', 
      bg: '#FAEEDA'
    };
  } else {
    return {
      display: 'Caution',
      color: '#E24B4A',
      bg: '#FAECE7'
    };
  }
}

module.exports = { getTimeRemaining, formatBidCount, getTrustBadge };
