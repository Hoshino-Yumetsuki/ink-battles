export default function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 py-8 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-muted-foreground">
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">关于 Ink Battles</h3>
            <p>
              基于 AI 的作品分析工具，为您的创作提供深度洞察与评分。
              本分析报告由AI生成，仅供参考。
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">隐私与条款</h3>
            <p>
              我们将严格保护您的隐私，并仅将您的数据用于提供本服务。
              您在使用本服务即视为同意将相关数据提供给为本服务提供支持的第三方服务商。
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">链接与支持</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/Hoshino-Yumetsuki/ink-battles"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  GitHub 仓库 (GPL-3.0 license)
                </a>
              </li>
              <li>
                <a
                  href="https://ink-battles.rikki.top/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  iykrzu 的作家战力分析
                </a>
              </li>
              <li>
                <a
                  href="https://afdian.com/a/q78kg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  支持我们 (爱发电)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-xs text-muted-foreground">
          <p>
            灵感来源 iykrzu，测试量表由三角之外设计，站点由 Q78KG 设计并编写。
          </p>
          <p className="mt-2">
            &copy; {new Date().getFullYear()} Ink Battles. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
