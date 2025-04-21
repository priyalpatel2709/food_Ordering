// Role-based access middleware
const allowedRoles = (roles) => {
  return (req, res, next) => {
    const userRole = req.user ? req.user.roleName : null;

    if (!userRole) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    if (roles.includes(userRole) || userRole === "admin") {
      next();
    } else {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Insufficient permissions",
      });
    }
  };
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  const userRole = req.user ? req.user.roleName : null;

  if (!userRole) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  if (
    userRole === "admin" &&
    req.header("X-Restaurant-Id") === req.user.restaurantsId
  ) {
    next();
  } else {
    return res.status(403).json({
      status: "error",
      message: "Admin access required",
    });
  }
};

// Librarian middleware
// const librarianAccess = (req, res, next) => {
//   const userRole = req.user ? req.user.role : null;

//   if (!userRole) {
//     return res.status(401).json({
//       status: "error",
//       message: "Authentication required",
//     });
//   }

//   if (userRole === "librarian" || userRole === "admin") {
//     next();
//   } else {
//     return res.status(403).json({
//       status: "error",
//       message: "Librarian access required",
//     });
//   }
// };

module.exports = {
  adminOnly,
  allowedRoles,
};
