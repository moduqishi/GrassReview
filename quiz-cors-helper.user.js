// ==UserScript==
// @name         超星刷题页 CORS 助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  为本地 quiz.html 提供 GM_xmlhttpRequest 桥接，绕过题库 API 与 AI 接口的 CORS 限制。装上后网页无需填 CORS 代理即可直连搜题。
// @author       Claude
// @match        file:///*quiz.html*
// @match        http://localhost/*quiz.html*
// @match        http://localhost:*/*quiz.html*
// @match        http://127.0.0.1/*quiz.html*
// @match        http://127.0.0.1:*/*quiz.html*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      api.tikuhai.com
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // 统一的 GM 桥接 fetch，返回一个类 Response 对象（与原生 fetch 接口兼容）
    pageWindow.__gmFetch = function (url, options) {
        options = options || {};
        const method = (options.method || 'GET').toUpperCase();
        const headers = options.headers || {};
        const body = options.body;
        const timeout = options.timeout || 30000;

        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== 'function') {
                reject(new Error('GM_xmlhttpRequest 不可用'));
                return;
            }
            GM_xmlhttpRequest({
                url: url,
                method: method,
                headers: headers,
                data: body,
                timeout: timeout,
                onload: (response) => {
                    const text = response.responseText || '';
                    resolve({
                        ok: response.status >= 200 && response.status < 300,
                        status: response.status,
                        statusText: response.statusText || '',
                        text: () => Promise.resolve(text),
                        json: () => {
                            try { return Promise.resolve(JSON.parse(text)); }
                            catch (e) { return Promise.reject(new SyntaxError('JSON 解析失败')); }
                        },
                        _gm: true
                    });
                },
                onerror: (err) => reject(new Error('GM 请求出错: ' + ((err && err.error) || '网络错误'))),
                ontimeout: () => reject(new Error('GM 请求超时'))
            });
        });
    };

    // 通知 quiz.html CORS 助手已就绪
    pageWindow.__gmCorsReady = true;
    pageWindow.dispatchEvent(new CustomEvent('gm-cors-ready'));
    try { console.log('[CORS 助手] GM_xmlhttpRequest 桥接已就绪'); } catch (e) {}
})();
