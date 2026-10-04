// 真实界面回归 OPML、FreeMind 和带命名空间前缀的 XML 导图；只用合成文件。
import {chromium} from 'playwright-core';import JSZip from 'jszip';import {strict as assert} from 'node:assert';
const url=process.argv[2]||'http://127.0.0.1:3004/qingxiaolu/';
const files=[{name:'目录.opml',mimeType:'text/xml',buffer:Buffer.from('<opml version="2.0"><body><outline text="小说"><outline text="第一章" _note="摘要第一段&#10;摘要第二段"/></outline></body></opml>')},{name:'人物.mm',mimeType:'text/xml',buffer:Buffer.from('<map version="1.0.1"><node><richcontent TYPE="NODE"><html><body><p>主角资料</p></body></html></richcontent><richcontent TYPE="NOTE"><html><body>\n<p>身份：作家</p>\n<p>动机：寻找旧信</p>\n</body></html></richcontent></node></map>')}];
const zip=new JSZip();zip.file('content.xml','<m:xmap-content xmlns:m="urn:xmind:xmap:xmlns:content:2.0"><m:sheet id="s"><m:topic id="root"><m:title>前缀目录</m:title><m:notes><m:plain>前缀正文</m:plain></m:notes><m:children><m:topics type="attached"><m:topic id="child"><m:title>前缀子节点</m:title><m:notes><m:plain>子节点摘要</m:plain></m:notes></m:topic></m:topics></m:children></m:topic></m:sheet></m:xmap-content>');files.push({name:'前缀.xmind',mimeType:'application/x-xmind',buffer:await zip.generateAsync({type:'nodebuffer'})});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const context=await browser.newContext(),page=await context.newPage();await context.route('**/qingxiaolu-api/**',r=>r.abort());await page.goto(url);await page.getByRole('button',{name:'先在本机使用',exact:true}).click();await page.getByRole('button',{name:/导入本地文档/}).click();await page.locator('input[type=file]').setInputFiles(files);await page.getByRole('heading',{name:'临时预览',exact:true}).waitFor();
 const card=name=>page.locator('.candidate-list article').filter({has:page.locator(`input[value="${name}"]`)});
 assert.ok((await card('目录').locator('textarea').inputValue()).includes('摘要第一段\n    摘要第二段'));
 assert.equal(await card('人物').locator('textarea').inputValue(),'- 主角资料\n  身份：作家\n  \n  动机：寻找旧信');
 assert.ok((await card('前缀').locator('textarea').inputValue()).includes('前缀子节点'));
 for(const name of ['目录','人物','前缀'])await card(name).getByRole('button',{name:'按导图节点拆分',exact:true}).click();
 assert.equal(await page.locator('.candidate-list article').count(),4);await page.getByText('预览已保存在本机，刷新可恢复',{exact:true}).waitFor();await page.reload();await page.locator('.candidate-list article').first().waitFor();assert.equal(await page.locator('.candidate-list article').count(),4);
 await page.getByRole('button',{name:'正式导入已选内容（4）',exact:true}).click();await page.getByText('已正式导入 4 条内容',{exact:true}).waitFor();await page.getByRole('button',{name:'稿件库',exact:true}).click();await page.locator('article[data-blog-month]').first().waitFor();assert.equal(await page.locator('article[data-blog-month]').count(),4);
 console.log(JSON.stringify({opmlNotes:true,freeMindRichTitle:true,freeMindParagraphNotes:true,prefixedXmlNodes:true,splitAndReload:true,formalImport:true}));
}finally{await browser.close();}