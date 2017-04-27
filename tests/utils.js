module.exports = {getTestHTML, createElementFromHTML, appendHTML}
function getTestHTML () {
  return `<div style="display:none" id="webpage">
	<!-- content script data extraction tests -->
	<div id="dataextract-elements">
		<a>test1</a>
		<a>test2</a>
	</div>

	<div id="dataextract-child-selectors">

		<table>
			<tr>
				<td>test1</td>
				<td>test11</td>
			</tr>
			<tr>
				<td>test2</td>
				<td>test22</td>
			</tr>
		</table>
	</div>

	<div id="dataextract-get-data">
		<a href="http://test.lv/a/">a</a>
		<a href="http://test.lv/b/">b</a>
		<span class="common">c</span>
	</div>

	<div id="dataextract-get-element-text">
		<div>
			<a href="http://test.lv/a/">a</a>
		</div>
		<div>
			<a href="http://test.lv/b/">b</a>
		</div>
	</div>

	<div id="dataextract-get-data-multiple-selectors">
		<div>
			<table>
				<tr>
					<td>result1</td>
				</tr>
				<tr>
					<td>result2</td>
				</tr>
			</table>
			<table>
				<tr>
					<td>result3</td>
				</tr>
				<tr>
					<td>result4</td>
				</tr>
			</table>
		</div>
	</div>

	<div id="dataextract-multiple-elements">
		<div>
			<div>
				<a href="http://test.lv/a/">a</a>
			</div>
		</div>
	</div>

	<div id="job-data">
		<a href="http://test.lv/a/">a</a>
		<a href="http://test.lv/b/">b</a>
	</div>

	<div id="content-selector-tests">
		<div>
                 <span id="content-selector-tests-expected">
                     <table></table>
                 </span>
		</div>
		<div>
                <span>
                    <table></table>
                </span>
		</div>
	</div>

	<div id="selector tests">
		<div id="selector-text">
			<div id="selector-text-single-text">
				<div>a</div>
				<div>b</div>
			</div>

			<div id="selector-text-multiple-text">
				<div>a</div>
				<div>b</div>
			</div>
			<div id="selector-text-url-multiple-text">
				<a href="http://aa/">a</a>
				<a href="http://bb/">b</a>
			</div>
			<div id="selector-text-single-not-exist">
			</div>
			<div id="selector-text-single-regex">
				<div>aaaaaaa11113123aaaaa11111</div>
			</div>
			<div id="selector-text-ignore-script">
				<div>aaa<script>var __a = 1;</script><style>.-no-no-test {overflow:auto}</style></div>
			</div>
			<div id="selector-text-newlines">
				<p>aaa<br>aaa<br />aaa<BR>aaa<BR />aaa</p>
			</div>
		</div>
		<div id="selector-html">
			<div id="selector-html-single-html">
				<div>aaa<b>bbb</b>ccc</div>
				<div>aaa<b>bbb</b>ccc</div>
			</div>
			<div id="selector-html-multiple-html">
				<div>aaa<b>bbb</b>ccc</div>
				<div>ddd<b>eee</b>fff</div>
			</div>
			<div id="selector-html-single-not-exis"></div>
		</div>

		<div id="selector-group">
			<div id="selector-group-text">
				<div>a</div>
				<div>b</div>
			</div>
			<div id="selector-group-url">
				<a href="http://aa/">a</a>
				<a href="http://bb/">b</a>
			</div>

			<div id="selector-group-img">
				<img src="http://aa/">
				<img src="http://bb/">
			</div>
		</div>

		<div id="selector-element">
			<div id="selector-element-nodata">
				<div>a</div>
				<div>b</div>
			</div>
		</div>

		<div id="selector-follow">
			<a href="http://example.com/a">a</a>
			<a href="http://example.com/b">b</a>
		</div>

		<div id="selector-image">

			<div id="selector-image-one-image">
				<img src="http://aa/">
			</div>
			<div id="selector-image-multiple-images">
				<img src="http://aa/">
				<img src="http://bb/">
			</div>

		</div>

		<div id="selector-table">
			<div id="selector-table-single-table-single-row">
				<table>
					<thead>
						<tr>
							<th>a</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>abc</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div id="selector-table-single-table-multiple-rows">
				<table>
					<thead>
					<tr>
						<th>b</th>
						<th>a</th>
					</tr>
					</thead>
					<tbody>
					<tr>
						<td>bbb</td>
						<td>aaa</td>
					</tr>
					<tr>
						<td>ddd</td>
						<td>ccc</td>
					</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<div id="browser-tests">
		<div id="browserTest">a</div>
	</div>

	<div id="scraper-tests">
		<div id="scraper-test-one-page">
			<a>a</a>
		</div>
		<div id="scraper-test-child-page">
			<a href="http://test.lv/1/">test</a>
			<b>b</b>
		</div>
	</div>

</div>
  
  `
}

function createElementFromHTML (html) {
  var template = document.createElement('template')
  template.innerHTML = html
  return template.content.firstChild
}

function appendHTML (element, html) {
  return element.appendChild(createElementFromHTML(html))
}
