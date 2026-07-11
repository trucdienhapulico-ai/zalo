chrome.runtime.onInstalled.addListener(()=>chrome.contextMenus.create({id:'zalo-task',title:'Tạo việc local từ đoạn này',contexts:['selection'],documentUrlPatterns:['https://chat.zalo.me/*']}));
chrome.contextMenus.onClicked.addListener((info,tab)=>{if(info.menuItemId==='zalo-task'&&tab?.id)chrome.tabs.sendMessage(tab.id,{type:'OPEN_TASK',text:info.selectionText})});
