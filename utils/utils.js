const getQueryParams = (value) => {
  if (value === undefined) return "_id";
  return value.replace(",", " ");
};

const parseQueryString = (queryString) => {
  if (!queryString) return null;

  try {
    // If it's a JSON string or object
    if (typeof queryString === "object") {
      return queryString;
    }

    // Handle JSON string
    if (queryString.startsWith("{")) {
      return JSON.parse(queryString);
    }

    // Handle dot notation
    return queryString.split(".").reduce((acc, field) => {
      acc[field.trim()] = 1;
      return acc;
    }, {});
  } catch (error) {
    console.error("Parse Query String Error:", error);
    return null;
  }
};

const buildPopulateOptions = (query) => {
  const extractNestedFields = (prefix, depth = 0) => {
    if (depth > 5) return null; // Prevent infinite nesting

    const fields = [];
    const nestedFieldPattern = new RegExp(`^${prefix}\\[(.*?)\\]`);

    Object.keys(query).forEach((key) => {
      const match = key.match(nestedFieldPattern);
      if (!match) return;

      const fieldName = match[1];
      const field = {
        field: fieldName,
        select: parseQueryString(query[`select[${prefix}${fieldName}]`]),
        options:
          parseQueryString(query[`options[${prefix}${fieldName}]`]) || {},
      };

      // Check for nested populations
      const nestedPrefix = `${prefix}${fieldName}.populate`;
      const nestedFields = extractNestedFields(nestedPrefix, depth + 1);
      if (nestedFields?.length > 0) {
        field.populateFields = nestedFields;
      }

      fields.push(field);
    });

    return fields;
  };

  return extractNestedFields("populate[");
};

const generateQnicOrderId = ({
  restaurantCode = "GEN",
  orderTypeCode = "GEN",
} = {}) => {
  const now = new Date();
  const datePart = now.toISOString().split("T")[0].replace(/-/g, ""); // e.g., 20250418
  const randomSegment = Math.floor(1000 + Math.random() * 9000); // 4-digit random number

  return `${restaurantCode}-${orderTypeCode}-${datePart}-${randomSegment}`;
};

module.exports = {
  getQueryParams,
  parseQueryString,
  buildPopulateOptions,
  generateQnicOrderId,
};
