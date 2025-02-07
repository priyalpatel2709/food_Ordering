const getQueryParams = (value) => {
  if (value === undefined) return "_id";
  return value.replace(",", " ");
};

module.exports = {
  getQueryParams,
};
