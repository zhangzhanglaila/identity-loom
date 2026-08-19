window.sampleGraph = {
  nodes: [
    { id: 'you', kind: 'you', name: 'YOU', status: 'active', notes: 'Root identity' },
    { id: 'google', kind: 'provider', name: 'Google' },
    { id: 'wechat', kind: 'provider', name: 'WeChat' },
    { id: 'phone_1', kind: 'identifier', name: 'Phone 1', phone: '13800000001' },
    { id: 'phone_2', kind: 'identifier', name: 'Phone 2', phone: '13900000002' },
    { id: 'email_1', kind: 'identifier', name: 'Email 1', email: 'alpha@example.com' },
    { id: 'email_2', kind: 'identifier', name: 'Email 2', email: 'beta@example.com' },
    { id: 'google_acc_a', kind: 'account', name: 'Google Account A', platform: 'Google', username: 'alpha.google' },
    { id: 'google_acc_b', kind: 'account', name: 'Google Account B', platform: 'Google', username: 'beta.google' },
    { id: 'chatgpt_acc_a', kind: 'account', name: 'ChatGPT Account A', platform: 'ChatGPT', username: 'alpha.gpt' },
    { id: 'douyin_acc_a', kind: 'account', name: 'Douyin Account A', platform: 'Douyin', username: 'douyin.alpha' },
    { id: 'bilibili_acc_a', kind: 'account', name: 'Bilibili Account A', platform: 'Bilibili', username: 'bili.alpha' }
  ],
  relationships: [
    { id: 'rel_1', source: 'you', target: 'google_acc_a', relation_type: 'owns', label: 'owns' },
    { id: 'rel_2', source: 'you', target: 'google_acc_b', relation_type: 'owns', label: 'owns' },
    { id: 'rel_3', source: 'google_acc_a', target: 'google', relation_type: 'belongs_to', label: 'belongs_to' },
    { id: 'rel_4', source: 'google_acc_b', target: 'google', relation_type: 'belongs_to', label: 'belongs_to' },
    { id: 'rel_5', source: 'google_acc_a', target: 'phone_1', relation_type: 'binds', label: 'binds' },
    { id: 'rel_6', source: 'google_acc_b', target: 'phone_2', relation_type: 'binds', label: 'binds' },
    { id: 'rel_7', source: 'google_acc_a', target: 'email_1', relation_type: 'verifies', label: 'verifies' },
    { id: 'rel_8', source: 'google_acc_b', target: 'email_2', relation_type: 'verifies', label: 'verifies' },
    { id: 'rel_9', source: 'google_acc_a', target: 'chatgpt_acc_a', relation_type: 'login_by', label: 'login_by' },
    { id: 'rel_10', source: 'wechat', target: 'douyin_acc_a', relation_type: 'login_by', label: 'login_by' },
    { id: 'rel_11', source: 'wechat', target: 'bilibili_acc_a', relation_type: 'login_by', label: 'login_by' }
  ]
};
