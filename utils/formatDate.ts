export const formatDate = (date: Date) => {
  return (
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) 
    // +
    // ' at ' +
    // date.toLocaleTimeString('en-US', {
    //   hour: '2-digit',
    //   minute: '2-digit',
    //   hour12: true,
    // })
  );
};
