const { parseQueryString, buildPopulateOptions } = require("../utils/utils");
const asyncHandler = require("express-async-handler");
// const queryHandler = (modelMappings) => (req, res, next) => {
//   const { select, ...query } = req.query;

//   req.queryOptions = {
//     select: parseQueryString(select),
//     populateFields: buildPopulateOptions(query, modelMappings),
//   };

//   next();
// };

const queryHandler = asyncHandler(async (req, res, next) => {
  const { select, expand, ...query } = req.query;

  console.log("File: queryHandler.js", "Line 17:", expand);

  try {
    req.queryOptions = {
      select: parseQueryString(select),
      expand: parseQueryString(expand),
      // populateFields: buildPopulateOptions(query),
    };

    next();
  } catch (error) {
    console.error("Query Handler Error:", error);
    res.status(500).json({
      success: false,
      error: "Invalid query parameters",
    });
  }
});

module.exports = { queryHandler };
