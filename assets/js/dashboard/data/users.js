/**
 * Demo user directory. In production this comes from Drupal's user/role
 * system — this file exists only so the prototype has consistent people
 * to reference across restaurants, team lists, and audit logs.
 */
(function () {
  window.MenuFlowUsers = {
    admin: {
      id: 'admin-1',
      name: 'DAIFY Admin',
      email: 'admin@daify.net',
      backupEmail: '',
      phone: '',
      role: 'admin',
      avatarInitial: 'M',
    },
    owner: {
      id: 'owner-1',
      name: 'Adam Kareem',
      email: 'adam@oliva.rest',
      backupEmail: 'adam.kareem@gmail.com',
      phone: '+965 6600 1840',
      role: 'owner',
      avatarInitial: 'A',
    },
    manager: {
      id: 'manager-1',
      name: 'Sara Hassan',
      email: 'sara@oliva.rest',
      backupEmail: '',
      phone: '',
      role: 'manager',
      avatarInitial: 'S',
    },
  };
})();
