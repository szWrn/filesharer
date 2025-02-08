const express = require("express");
const fs = require("fs");
const path = require("path");
const yargs = require('yargs');
const os = require('os');

const app = express();

app.use(express.static(path.join(__dirname, "public")))

function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const localIps = [];

    for (const interfaceName in interfaces) {
        const interfaceInfo = interfaces[interfaceName];
        for (const iface of interfaceInfo) {
            // 过滤出 IPv4 地址且非内部地址
            if (iface.family === 'IPv4' && !iface.internal) {
                localIps.push(iface.address);
            }
        }
    }

    // 如果只有一个 IP 地址，直接返回字符串；否则返回数组
    return localIps;
}

function mapFilesToRoutes(dir, route) {
    var index = "";
    fs.readdirSync(dir).forEach(file => {
        // 获取文件名与索引
        const fullPath = path.join(dir, file);
        var nroute = route + "/" + file;

        if (fs.statSync(fullPath).isDirectory()) {
            // 添加到索引页面
            index += `<div class='dir' onclick="window.location.href = '${nroute}'">${file}</div>\n`;

            mapFilesToRoutes(fullPath, nroute);
        } else {
            // 添加到索引页面
            index += `<div class='file' onclick="window.location.href = '${nroute}'">${file}</div>\n`;

            app.get(nroute, (req, res) => {
                res.download(fullPath, file);
            })
        }
    });
    // 处理请求
    app.get(route, (req, res) => {
        fs.readFile("pages/index/index.html", "utf-8", (err, data) => {
            if (err) console.log(`Error: ${err}`);
            if (route) res.send(data.replace("{route}", route).replace("{index}", index));
            else res.send(data.replace("{route}", "/").replace("{index}", index));
        })
    })
}

app.get("/style.css", (req, res) => {
    fs.readFile("pages/index/style.css", "utf-8", (err, data) => {
        res.send(data);
    })
})

// 解析命令行参数
const argv = yargs.option('port', {
    alias: 'p',
    description: '服务器端口',
    type: 'number',
}).option('folder', {
    alias: 'f',
    description: '要分享的文件夹',
    type: 'string'
}).help().alias('help', 'h').argv;

const port = argv.port ? argv.port : 8080;
const folder = argv.folder ? argv.folder : process.cwd();

mapFilesToRoutes(folder, '');

app.listen(port, () => {
    const ips = getLocalIpAddresses();
    for (var i = 0; i < ips.length; i++) console.log(`Server is running at http://${ips[i]}:${port}`)
})
