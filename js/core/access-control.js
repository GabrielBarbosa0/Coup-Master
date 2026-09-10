(function setupAccessControl(root) {
  const PERMISSIONS = Object.freeze({
    CASUAL_ADD_TEST_BOT: 'casual.addTestBot',
    CASUAL_TOGGLE_COMPATIBILITY: 'casual.toggleCompatibility'
  });

  const ACCESS_BY_UID = Object.freeze({
    EGFqOCmjvGPH9rT8Ls2CeYsAA1m2: Object.freeze(['*'])
  });

  function getAuthenticatedUid() {
    return root.auth?.currentUser?.uid || '';
  }

  function hasPermission(permission, uid = getAuthenticatedUid()) {
    const grantedPermissions = ACCESS_BY_UID[String(uid || '')] || [];
    return grantedPermissions.includes('*') || grantedPermissions.includes(permission);
  }

  function applyVisibility(container = document, uid = getAuthenticatedUid()) {
    container.querySelectorAll?.('[data-app-permission]').forEach((element) => {
      element.hidden = !hasPermission(element.dataset.appPermission, uid);
    });
  }

  root.CoupAccessControl = Object.freeze({
    PERMISSIONS,
    hasPermission,
    applyVisibility
  });
})(window);
